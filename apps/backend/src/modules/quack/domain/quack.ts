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
  polls: QuackPoll[];
  user?: QuackAuthor;
};

export type QuackPoll = {
  id: string;
  question: string;
  status: 'open' | 'closed';
  resultsVisible: boolean;
  myVoteOptionId: string | null;
  options: QuackPollOption[];
};

export type QuackPollOption = {
  id: string;
  label: string;
  position: number;
  voteCount: number | null;
};
