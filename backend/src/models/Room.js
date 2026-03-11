import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

class Room {
    constructor(db) {
        this.db = db;
    }

    async create(data) {
        const {
            name,
            adminName,
            password,
            language = 'ko'
        } = data;

        const id = uuidv4();
        const entryCode = this.generateEntryCode();
        const passwordHash = await bcrypt.hash(password, 12);

        await this.db.run(`
            INSERT INTO rooms (id, name, admin_name, password_hash, entry_code, language)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, name, adminName, passwordHash, entryCode, language]);

        return {
            id,
            name,
            adminName,
            entryCode,
            language,
            createdAt: new Date().toISOString(),
            settlementStatus: 'active'
        };
    }

    async findById(id) {
        const room = await this.db.get(`
            SELECT * FROM rooms WHERE id = ?
        `, [id]);

        if (!room) return null;

        return {
            id: room.id,
            name: room.name,
            adminName: room.admin_name,
            entryCode: room.entry_code,
            language: room.language,
            createdAt: room.created_at,
            lastActivity: room.last_activity,
            settlementStatus: room.settlement_status,
            expiresAt: room.expires_at
        };
    }

    async findByEntryCode(entryCode) {
        const room = await this.db.get(`
            SELECT * FROM rooms WHERE entry_code = ?
        `, [entryCode]);

        if (!room) return null;

        return {
            id: room.id,
            name: room.name,
            adminName: room.admin_name,
            entryCode: room.entry_code,
            language: room.language,
            createdAt: room.created_at,
            lastActivity: room.last_activity,
            settlementStatus: room.settlement_status,
            expiresAt: room.expires_at
        };
    }

    async updateLastActivity(id) {
        await this.db.run(`
            UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE id = ?
        `, [id]);
    }

    async updateSettlementStatus(id, status) {
        await this.db.run(`
            UPDATE rooms SET settlement_status = ? WHERE id = ?
        `, [status, id]);
    }

    async verifyPassword(id, password) {
        const room = await this.db.get(`
            SELECT password_hash FROM rooms WHERE id = ?
        `, [id]);

        if (!room) return false;

        return await bcrypt.compare(password, room.password_hash);
    }

    async delete(id) {
        await this.db.run(`
            DELETE FROM rooms WHERE id = ?
        `, [id]);
    }

    async findExpiredRooms() {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        return await this.db.all(`
            SELECT id, name FROM rooms 
            WHERE settlement_status = 'completed' 
            AND last_activity < ?
        `, [oneMonthAgo.toISOString()]);
    }

    generateEntryCode() {
        // Generate 6-digit entry code
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async getRoomStats(id) {
        const participants = await this.db.all(`
            SELECT COUNT(*) as count FROM participants WHERE room_id = ?
        `, [id]);

        const receipts = await this.db.all(`
            SELECT COUNT(*) as count FROM receipts WHERE room_id = ?
        `, [id]);

        const totalAmount = await this.db.get(`
            SELECT SUM(total_amount) as total FROM receipts WHERE room_id = ?
        `, [id]);

        return {
            participantCount: participants[0]?.count || 0,
            receiptCount: receipts[0]?.count || 0,
            totalAmount: totalAmount?.total || 0
        };
    }
}

export default Room
