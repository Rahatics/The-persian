// Request schema (VS Code ➔ Browser)
export interface ParsianRequest {
  id: string; // uuid-v4
  system_role: 'STRICT_JSON_ONLY_MODE';
  action_type: 'CODE_SUGGEST' | 'EXPLAIN' | 'RUN_COMMAND';
  context: {
    file_path?: string;
    code_snippet?: string;
    recent_history?: any[];
    project_context?: any;
  };
  user_query: string;
}

// Response schema (Browser ➔ VS Code)
export interface ParsianResponse {
  request_id: string; // uuid-v4
  status: 'success' | 'error';
  data: {
    content: string;
    language?: string;
  };
  security: {
    requires_confirmation: boolean;
    confidence: 'high' | 'medium' | 'low';
  };
}