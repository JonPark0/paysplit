import { v4 as uuidv4 } from 'uuid'

class Receipt {
    constructor(db) {
        this.db = db;
    }

    async create(data) {
        const {
            roomId,
            uploaderId,
            payerId,
            originalFilename,
            encryptedFilename,
            totalAmount,
            currency = 'KRW',
            items = []
        } = data;

        const receiptId = uuidv4();

        // Create receipt - if no payer specified, default to uploader
        const actualPayerId = payerId || uploaderId;
        
        await this.db.run(`
            INSERT INTO receipts (id, room_id, uploader_id, payer_id, original_filename, encrypted_filename, total_amount, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [receiptId, roomId, uploaderId, actualPayerId, originalFilename, encryptedFilename, totalAmount, currency]);

        // Create receipt items
        const createdItems = [];
        for (const item of items) {
            const itemId = uuidv4();
            await this.db.run(`
                INSERT INTO receipt_items (id, receipt_id, name, price, quantity, category)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [itemId, receiptId, item.name, item.price, item.quantity || 1, item.category]);

            createdItems.push({
                id: itemId,
                receiptId,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                category: item.category
            });
        }

        return {
            id: receiptId,
            roomId,
            uploaderId,
            payerId: actualPayerId,
            originalFilename,
            encryptedFilename,
            totalAmount,
            currency,
            items: createdItems,
            createdAt: new Date().toISOString()
        };
    }

    async findById(id) {
        const receipt = await this.db.get(`
            SELECT * FROM receipts WHERE id = ?
        `, [id]);

        if (!receipt) return null;

        const items = await this.db.all(`
            SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY name
        `, [id]);

        return {
            id: receipt.id,
            roomId: receipt.room_id,
            uploaderId: receipt.uploader_id,
            payerId: receipt.payer_id,
            originalFilename: receipt.original_filename,
            encryptedFilename: receipt.encrypted_filename,
            totalAmount: receipt.total_amount,
            currency: receipt.currency,
            createdAt: receipt.created_at,
            items: items.map(item => ({
                id: item.id,
                receiptId: item.receipt_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category
            }))
        };
    }

    async findByRoomId(roomId) {
        const receipts = await this.db.all(`
            SELECT 
                r.*,
                up.name as uploader_name,
                pp.name as payer_name
            FROM receipts r
            JOIN participants up ON r.uploader_id = up.id
            LEFT JOIN participants pp ON r.payer_id = pp.id
            WHERE r.room_id = ?
            ORDER BY r.created_at DESC
        `, [roomId]);

        const result = [];
        for (const receipt of receipts) {
            const items = await this.db.all(`
                SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY name
            `, [receipt.id]);

            result.push({
                id: receipt.id,
                roomId: receipt.room_id,
                uploaderId: receipt.uploader_id,
                uploaderName: receipt.uploader_name,
                payerId: receipt.payer_id,
                payerName: receipt.payer_name,
                originalFilename: receipt.original_filename,
                encryptedFilename: receipt.encrypted_filename,
                totalAmount: receipt.total_amount,
                currency: receipt.currency,
                createdAt: receipt.created_at,
                items: items.map(item => ({
                    id: item.id,
                    receiptId: item.receipt_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    category: item.category
                }))
            });
        }

        return result;
    }

    async updateItems(receiptId, items) {
        // Delete existing items
        await this.db.run(`
            DELETE FROM receipt_items WHERE receipt_id = ?
        `, [receiptId]);

        // Create new items
        const createdItems = [];
        for (const item of items) {
            const itemId = uuidv4();
            await this.db.run(`
                INSERT INTO receipt_items (id, receipt_id, name, price, quantity, category)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [itemId, receiptId, item.name, item.price, item.quantity || 1, item.category]);

            createdItems.push({
                id: itemId,
                receiptId,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                category: item.category
            });
        }

        // Update total amount
        const totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        await this.db.run(`
            UPDATE receipts SET total_amount = ? WHERE id = ?
        `, [totalAmount, receiptId]);

        return createdItems;
    }

    async delete(id) {
        // Items will be deleted automatically due to CASCADE
        await this.db.run(`
            DELETE FROM receipts WHERE id = ?
        `, [id]);
    }

    async getReceiptSplits(receiptId) {
        return await this.db.all(`
            SELECT 
                s.*,
                ri.name as item_name,
                ri.price as item_price,
                p.name as participant_name
            FROM splits s
            JOIN receipt_items ri ON s.item_id = ri.id
            JOIN participants p ON s.participant_id = p.id
            WHERE ri.receipt_id = ?
            ORDER BY ri.name, p.name
        `, [receiptId]);
    }

    async getRoomReceiptStats(roomId) {
        const stats = await this.db.get(`
            SELECT 
                COUNT(*) as receipt_count,
                SUM(total_amount) as total_amount,
                COUNT(DISTINCT uploader_id) as uploaders_count
            FROM receipts
            WHERE room_id = ?
        `, [roomId]);

        const itemStats = await this.db.get(`
            SELECT 
                COUNT(*) as item_count,
                AVG(price) as avg_item_price
            FROM receipt_items ri
            JOIN receipts r ON ri.receipt_id = r.id
            WHERE r.room_id = ?
        `, [roomId]);

        return {
            receiptCount: stats?.receipt_count || 0,
            totalAmount: stats?.total_amount || 0,
            uploadersCount: stats?.uploaders_count || 0,
            itemCount: itemStats?.item_count || 0,
            avgItemPrice: itemStats?.avg_item_price || 0
        };
    }
}

export default Receipt