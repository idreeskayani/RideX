import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface RideState {
  pickup: Coordinates | null;
  destination: Coordinates | null;
  rideId: string | null;
  status: string | null;
}

const initialState: RideState = {
  pickup: null,
  destination: null,
  rideId: null,
  status: null,
};

const rideSlice = createSlice({
  name: 'ride',
  initialState,
  reducers: {
    setRideLocations(
      state,
      action: PayloadAction<{ pickup: Coordinates; destination: Coordinates }>,
    ) {
      state.pickup = action.payload.pickup;
      state.destination = action.payload.destination;
    },
    setRideId(state, action: PayloadAction<string>) {
      state.rideId = action.payload;
    },
    setRideStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    clearRide(state) {
      state.pickup = null;
      state.destination = null;
      state.rideId = null;
      state.status = null;
    },
  },
});

export const { setRideLocations, setRideId, setRideStatus, clearRide } =
  rideSlice.actions;

export default rideSlice.reducer;
