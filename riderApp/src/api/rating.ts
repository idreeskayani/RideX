import api from './axios';

export const submitRating = async (
  rideId: string,
  stars: number,
  review?: string,
) => {
  const response = await api.post(`/rating/${rideId}`, { stars, review });
  return response.data;
};
