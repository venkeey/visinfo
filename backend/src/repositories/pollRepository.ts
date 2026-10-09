/**
 * Poll Repository
 * Data access layer for polls
 */

import { pool } from '../database/config';
import { Poll, PollStatus } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class PollRepository {
  /**
   * Create a new poll
   */
  async create(poll: Omit<Poll, 'id' | 'createdAt' | 'status' | 'responseCount'>): Promise<Poll> {
    const id = uuidv4();
    const query = `
      INSERT INTO polls (id, question, description, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      poll.question,
      poll.description,
      poll.expiresAt,
      poll.createdBy,
    ]);

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find poll by ID
   */
  async findById(id: string): Promise<Poll | null> {
    const query = 'SELECT * FROM polls WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update poll status
   */
  async updateStatus(id: string, status: PollStatus): Promise<void> {
    const query = 'UPDATE polls SET status = $1, updated_at = NOW() WHERE id = $2';
    await pool.query(query, [status, id]);
  }

  /**
   * Update poll processing timestamps
   */
  async updateProcessingTimestamps(
    id: string,
    timestamps: { processingStartedAt?: Date; processingCompletedAt?: Date }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (timestamps.processingStartedAt) {
      updates.push(`processing_started_at = $${paramIndex++}`);
      values.push(timestamps.processingStartedAt);
    }

    if (timestamps.processingCompletedAt) {
      updates.push(`processing_completed_at = $${paramIndex++}`);
      values.push(timestamps.processingCompletedAt);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id);
      const query = `UPDATE polls SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      await pool.query(query, values);
    }
  }

  /**
   * Increment response count
   */
  async incrementResponseCount(id: string): Promise<void> {
    const query = 'UPDATE polls SET response_count = response_count + 1 WHERE id = $1';
    await pool.query(query, [id]);
  }

  /**
   * Find expired polls that need processing
   */
  async findExpiredPolls(): Promise<Poll[]> {
    const query = `
      SELECT * FROM polls
      WHERE expires_at <= NOW()
        AND status = $1
      ORDER BY expires_at ASC
    `;
    const result = await pool.query(query, [PollStatus.ACTIVE]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Find all polls
   */
  async findAll(limit: number = 100, offset: number = 0): Promise<Poll[]> {
    const query = `
      SELECT * FROM polls
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Delete poll
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM polls WHERE id = $1';
    await pool.query(query, [id]);
  }

  /**
   * Map database row to Poll model
   */
  private mapRow(row: any): Poll {
    return {
      id: row.id,
      question: row.question,
      description: row.description,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      status: row.status as PollStatus,
      responseCount: row.response_count,
      processingStartedAt: row.processing_started_at,
      processingCompletedAt: row.processing_completed_at,
      createdBy: row.created_by,
    };
  }
}

// Export singleton instance
export const pollRepository = new PollRepository();
