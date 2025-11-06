const db = require('../config/database');

class NotificationController {
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { is_read } = req.query;

      let query = `
        SELECT n.*, m.title as manga_title, c.chapter_number
        FROM notifications n
        JOIN mangas m ON n.manga_id = m.id
        LEFT JOIN chapters c ON n.chapter_id = c.id
        WHERE n.user_id = $1
      `;
      
      const params = [userId];

      if (is_read !== undefined) {
        query += ' AND n.is_read = $2';
        params.push(is_read === 'true');
      }

      query += ' ORDER BY n.created_at DESC';

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const result = await db.query(
        `UPDATE notifications 
         SET is_read = true 
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await db.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
      );

      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({ error: 'Failed to update notifications' });
    }
  }

  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
}

module.exports = new NotificationController();
