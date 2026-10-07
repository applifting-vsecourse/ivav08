export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type Quack = {
  id: string;
  text: string;
  mood: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
};
