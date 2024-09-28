export type Payload = {
  ip?: string;
  country?: string;
  city?: string | unknown;
  region?: string | unknown;
  org?: string | unknown;
  timezone?: string | unknown;
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
