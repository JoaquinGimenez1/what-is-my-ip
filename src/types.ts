export type Payload = {
  ip?: string;
  country?: string;
  city?: string;
  region?: string;
  org?: string;
  timezone?: string;
};

type Group = {
  id: string;
  name: string;
  email: string;
};

export type User = {
  id?: string;
  name?: string;
  email?: string;
  groups?: Group[];
};
