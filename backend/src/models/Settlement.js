import { v4 as uuidv4 } from 'uuid'

class Settlement {
    constructor(db) {
        this.db = db;
    }

    async createSplit(data) {
        const {
            itemId,
            participantId,
            amount
        } = data;

        const id = uuidv4();

        await this.db.run(`
            INSERT INTO splits (id, item_id, participant_id, amount)
            VALUES (?, ?, ?, ?)
        `, [id, itemId, participantId, amount]);

        return {
            id,
            itemId,
            participantId,
            amount,
            createdAt: new Date().toISOString()
        };
    }

    async updateSplit(splitId, amount) {
        await this.db.run(`
            UPDATE splits SET amount = ? WHERE id = ?
        `, [amount, splitId]);
    }

    async deleteSplit(splitId) {
        await this.db.run(`
            DELETE FROM splits WHERE id = ?
        `, [splitId]);
    }

    async getSplitsByItem(itemId) {
        return await this.db.all(`
            SELECT 
                s.*,
                p.name as participant_name
            FROM splits s
            JOIN participants p ON s.participant_id = p.id
            WHERE s.item_id = ?
            ORDER BY p.name
        `, [itemId]);
    }

    async getSplitsByParticipant(participantId) {
        return await this.db.all(`
            SELECT 
                s.*,
                ri.name as item_name,
                ri.price as item_price,
                r.original_filename as receipt_filename
            FROM splits s
            JOIN receipt_items ri ON s.item_id = ri.id
            JOIN receipts r ON ri.receipt_id = r.id
            WHERE s.participant_id = ?
            ORDER BY s.created_at DESC
        `, [participantId]);
    }

    async calculateOptimalSettlement(roomId) {
        // 각 참가자의 지불 금액과 부담 금액을 계산
        const participants = await this.db.all(`
            SELECT id, name FROM participants WHERE room_id = ?
        `, [roomId]);

        const balances = [];

        for (const participant of participants) {
            // 지불한 금액 (영수증 업로드)
            const paid = await this.db.get(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM receipts
                WHERE uploader_id = ?
            `, [participant.id]);

            // 부담해야 할 금액 (분할된 금액)
            const owed = await this.db.get(`
                SELECT COALESCE(SUM(amount), 0) as total
                FROM splits
                WHERE participant_id = ?
            `, [participant.id]);

            const balance = (paid?.total || 0) - (owed?.total || 0);
            balances.push({
                id: participant.id,
                name: participant.name,
                paid: paid?.total || 0,
                owed: owed?.total || 0,
                balance: balance
            });
        }

        // 최적 정산 계산 (그리디 알고리즘)
        const settlements = this.calculateMinimalTransactions(balances);

        return {
            balances,
            settlements,
            totalAmount: balances.reduce((sum, b) => sum + b.paid, 0)
        };
    }

    calculateMinimalTransactions(balances) {
        const settlements = [];
        const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));
        const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));

        // 그리디 알고리즘으로 최소 송금 계산
        while (debtors.length > 0 && creditors.length > 0) {
            const debtor = debtors[0];
            const creditor = creditors[0];

            const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

            if (amount > 0.01) { // 1원 이상인 경우만 정산
                settlements.push({
                    from: {
                        id: debtor.id,
                        name: debtor.name
                    },
                    to: {
                        id: creditor.id,
                        name: creditor.name
                    },
                    amount: Math.round(amount)
                });

                debtor.balance += amount;
                creditor.balance -= amount;
            }

            // 균형이 맞춰진 경우 배열에서 제거
            if (Math.abs(debtor.balance) < 0.01) {
                debtors.shift();
            }
            if (creditor.balance < 0.01) {
                creditors.shift();
            }
        }

        return settlements;
    }

    async createSettlement(data) {
        const {
            roomId,
            fromParticipantId,
            toParticipantId,
            amount
        } = data;

        const id = uuidv4();

        await this.db.run(`
            INSERT INTO settlements (id, room_id, from_participant_id, to_participant_id, amount)
            VALUES (?, ?, ?, ?, ?)
        `, [id, roomId, fromParticipantId, toParticipantId, amount]);

        return {
            id,
            roomId,
            fromParticipantId,
            toParticipantId,
            amount,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    }

    async updateSettlementStatus(settlementId, status, participantId) {
        // 송금 받는 사람만 상태를 변경할 수 있음
        const settlement = await this.db.get(`
            SELECT to_participant_id FROM settlements WHERE id = ?
        `, [settlementId]);

        if (!settlement || settlement.to_participant_id !== participantId) {
            throw new Error('권한이 없습니다');
        }

        const completedAt = status === 'completed' ? new Date().toISOString() : null;

        await this.db.run(`
            UPDATE settlements 
            SET status = ?, completed_at = ?
            WHERE id = ?
        `, [status, completedAt, settlementId]);

        return { status, completedAt };
    }

    async getSettlementsByRoom(roomId) {
        return await this.db.all(`
            SELECT 
                s.*,
                fp.name as from_participant_name,
                tp.name as to_participant_name
            FROM settlements s
            JOIN participants fp ON s.from_participant_id = fp.id
            JOIN participants tp ON s.to_participant_id = tp.id
            WHERE s.room_id = ?
            ORDER BY s.created_at DESC
        `, [roomId]);
    }

    async deleteSettlement(settlementId) {
        await this.db.run(`
            DELETE FROM settlements WHERE id = ?
        `, [settlementId]);
    }

    async clearAllSplits(roomId) {
        await this.db.run(`
            DELETE FROM splits 
            WHERE item_id IN (
                SELECT ri.id 
                FROM receipt_items ri
                JOIN receipts r ON ri.receipt_id = r.id
                WHERE r.room_id = ?
            )
        `, [roomId]);
    }

    async getParticipantBalances(roomId) {
        const participants = await this.db.all(`
            SELECT id, name FROM participants WHERE room_id = ?
        `, [roomId]);

        const balances = [];

        for (const participant of participants) {
            // 지불한 금액 (영수증 업로드)
            const paid = await this.db.get(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM receipts
                WHERE uploader_id = ? AND room_id = ?
            `, [participant.id, roomId]);

            // 부담해야 할 금액 (분할된 금액)
            const owed = await this.db.get(`
                SELECT COALESCE(SUM(s.amount), 0) as total
                FROM splits s
                JOIN receipt_items ri ON s.item_id = ri.id
                JOIN receipts r ON ri.receipt_id = r.id
                WHERE s.participant_id = ? AND r.room_id = ?
            `, [participant.id, roomId]);

            const balance = (paid?.total || 0) - (owed?.total || 0);
            balances.push({
                id: participant.id,
                name: participant.name,
                balance: balance
            });
        }

        return balances;
    }

    async getOptimalTransactions(roomId) {
        const balances = await this.getParticipantBalances(roomId);
        const transactions = this.calculateMinimalTransactions(balances);
        
        return transactions.map(t => ({
            fromId: t.from.id,
            fromName: t.from.name,
            toId: t.to.id,
            toName: t.to.name,
            amount: t.amount,
            status: 'pending'
        }));
    }
}

export default Settlement