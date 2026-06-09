export interface SidecarRecommendation {
  category: string;
  score: number;
  source: 'rule' | 'fallback';
}

export interface SidecarRecommendResponse {
  recommendations: SidecarRecommendation[];
}
