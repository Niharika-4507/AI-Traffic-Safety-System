import apiClient from './client';

export const processVideo = async ({
  video_path,
  camera_id = 'CAM-HIGHWAY-02',
  sample_fps = 5.0,
  conf_threshold = 0.35,
  temporal_min_hits = 2,
  temporal_window_sec = 1.5,
  save_annotated_video = false,
}) => {
  const payload = {
    video_path,
    camera_id,
    sample_fps: parseFloat(sample_fps),
    conf_threshold: parseFloat(conf_threshold),
    temporal_min_hits: parseInt(temporal_min_hits, 10),
    temporal_window_sec: parseFloat(temporal_window_sec),
    save_annotated_video: Boolean(save_annotated_video),
  };
  const response = await apiClient.post('/process-video', payload);
  return response.data;
};
