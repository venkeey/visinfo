/**
 * Response Repository
 * Data access layer for poll responses
 */

import { pool } from '../database/config';
import { Response } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class ResponseRepository {
  /**
   * Create a new response
   */
  async create(response: Omit<Response, 'id' | 'submittedAt'>): Promise<Response> {
    const id = uuidv4();
    const query = `
      INSERT INTO responses (id, poll_id, user_id, text)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [id, response.pollId, response.userId, response.text]);

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all responses for a poll
   */
  async findByPollId(pollId: string): Promise<Response[]> {
    const query = `
      SELECT * FROM responses
      WHERE poll_id = $1
      ORDER BY submitted_at ASC
    `;
    const result = await pool.query(query, [pollId]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Find response by ID
   */
  async findById(id: string): Promise<Response | null> {
    const query = 'SELECT * FROM responses WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update response embedding
   */
  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const query = 'UPDATE responses SET embedding = $1 WHERE id = $2';
    await pool.query(query, [JSON.stringify(embedding), id]);
  }

  /**
   * Batch update embeddings
   */
  async batchUpdateEmbeddings(updates: Array<{ id: string; embedding: number[] }>): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        await client.query('UPDATE responses SET embedding = $1 WHERE id = $2', [
          JSON.stringify(update.embedding),
          update.id,
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update response cluster assignment
   */
  async updateCluster(id: string, clusterId: string): Promise<void> {
    const query = 'UPDATE responses SET cluster_id = $1 WHERE id = $2';
    await pool.query(query, [clusterId, id]);
  }

  /**
   * Get count of responses for a poll
   */
  async countByPollId(pollId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM responses WHERE poll_id = $1';
    const result = await pool.query(query, [pollId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Delete all responses for a poll
   */
  async deleteByPollId(pollId: string): Promise<void> {
    const query = 'DELETE FROM responses WHERE poll_id = $1';
    await pool.query(query, [pollId]);
  }

  /**
   * Get responses by cluster
   */
  async findByClusterId(clusterId: string): Promise<Response[]> {
    const query = `
      SELECT * FROM responses
      WHERE cluster_id = $1
      ORDER BY submitted_at ASC
    `;
    const result = await pool.query(query, [clusterId]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Map database row to Response model
   */
  private mapRow(row: any): Response {
    return {
      id: row.id,
      pollId: row.poll_id,
      userId: row.user_id,
      text: row.text,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      clusterId: row.cluster_id,
      submittedAt: row.submitted_at,
    };
  }
}

// Export singleton instance
export const responseRepository = new ResponseRepository();
