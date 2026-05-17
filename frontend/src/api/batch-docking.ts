import { apiClient } from '@/lib/apiClient'

export interface BatchDockingRequest {
  receptor_content: string
  smiles_list: string[]
  center_x?: number
  center_y?: number
  center_z?: number
  size_x?: number
  size_y?: number
  size_z?: number
  exhaustiveness?: number
  num_modes?: number
  mode?: 'fast' | 'accurate'
  batch_size?: number
}

export interface BatchDockingProgress {
  job_id: string
  status: string
  stage: string
  vina_done: number
  vina_total: number
  gnina_done: number
  gnina_total: number
  total_ligands: number
  errors: number
  progress_percent: number
}

export interface BatchDockingResult {
  job_id: string
  status: string
  total_ligands: number
  vina_completed: number
  gnina_completed: number
  errors: number
  top_5: Array<Record<string, any>>
  all_results: Array<Record<string, any>>
  errors_detail: Array<{ smiles: string; error: string }>
  gpu_info?: Record<string, any>
  mode?: string
  filter_threshold?: number
  filter_top_n?: number
}

export const batchDockingAPI = {
  start: async (req: BatchDockingRequest): Promise<{ job_id: string; status: string; total_ligands: number; message: string }> => {
    const { data } = await apiClient.post('/batch/docking', req)
    return data
  },

  getProgress: async (jobId: string): Promise<BatchDockingProgress> => {
    const { data } = await apiClient.get(`/batch/docking/${jobId}/progress`)
    return data
  },

  getResults: async (jobId: string): Promise<BatchDockingResult> => {
    const { data } = await apiClient.get(`/batch/docking/${jobId}/results`)
    return data
  },

  cancel: async (jobId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/batch/docking/${jobId}`)
    return data
  },
}
