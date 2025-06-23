export interface ProcessingJob {
  id: string;
  created_at: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  job_type: 'pdf_processing' | 'batch_processing' | 'validation';
  metadata?: {
    pdf_url?: string;
    file_size?: number;
    page_count?: number;
    user_tier?: string;
    [key: string]: any;
  };
  retry_count: number;
  priority?: number;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  result?: any;
}