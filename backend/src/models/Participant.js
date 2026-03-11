import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

class Participant {
    constructor(db) {
        this.db = db;
    }

    async create(data) {
        const {
            roomId,
            name,
            password,
            isAdmin = false
        } = data;

        const id = uuidv4();
        const passwordHash = await bcrypt.hash(password, 12);

        await this.db.run(`
            INSERT INTO participants (id, room_id, name, password_hash, is_admin)
            VALUES (?, ?, ?, ?, ?)
        `, [id, roomId, name, passwordHash, isAdmin]);

        return {
            id,
            roomId,
            name,
            isAdmin,
            joinedAt: new Date().toISOString()
        };
    }

    async findById(id) {
        const participant = await this.db.get(`
            SELECT * FROM participants WHERE id = ?
        `, [id]);

        if (!participant) return null;

        return {
            id: participant.id,
            roomId: participant.room_id,
            name: participant.name,
            isAdmin: Boolean(participant.is_admin),
            joinedAt: participant.joined_at
        };
    }

    async findByRoomId(roomId) {
        const participants = await this.db.all(`
            SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at
        `, [roomId]);

        return participants.map(p => ({
            id: p.id,
            roomId: p.room_id,
            name: p.name,
            isAdmin: Boolean(p.is_admin),
            joinedAt: p.joined_at
        }));
    }

    async findByRoomAndName(roomId, name) {
        const participant = await this.db.get(`
            SELECT * FROM participants WHERE room_id = ? AND name = ?
        `, [roomId, name]);

        if (!participant) return null;

        return {
            id: participant.id,
            roomId: participant.room_id,
            name: participant.name,
            isAdmin: Boolean(participant.is_admin),
            joinedAt: participant.joined_at
        };
    }

    async verifyPassword(id, password) {
        const participant = await this.db.get(`
            SELECT password_hash FROM participants WHERE id = ?
        `, [id]);

        if (!participant) return false;

        return await bcrypt.compare(password, participant.password_hash);
    }

    async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        
        await this.db.run(`
            UPDATE participants SET password_hash = ? WHERE id = ?
        `, [passwordHash, id]);
    }

    async delete(id) {
        await this.db.run(`
            DELETE FROM participants WHERE id = ?
        `, [id]);
    }

    async getParticipantBalance(participantId) {
        // 참가자가 지불한 총 금액 (영수증 업로드)
        const paid = await this.db.get(`
            SELECT SUM(total_amount) as total
            FROM receipts
            WHERE uploader_id = ?
        `, [participantId]);

        // 참가자가 부담해야 할 총 금액 (분할된 금액)
        const owed = await this.db.get(`
            SELECT SUM(amount) as total
            FROM splits
            WHERE participant_id = ?
        `, [participantId]);

        const paidAmount = paid?.total || 0;
        const owedAmount = owed?.total || 0;

        return {
            paid: paidAmount,
            owed: owedAmount,
            balance: paidAmount - owedAmount // 양수면 받을 돈, 음수면 줄 돈
        };
    }

    async getParticipantSplits(participantId) {
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
}

export default Participant
