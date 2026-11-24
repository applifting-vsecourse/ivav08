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
  /** Tombstone: the content (text, mood, polls) has been wiped. ADR 0001. */
  deleted: boolean;
  polls: QuackPoll[];
  replies: QuackReply[];
  /** Counted from the like rows; 0 for a deleted quack. ADR 0002. */
  likeCount: number;
  /** Whether the viewer is one of the likes. */
  likedByMe: boolean;
  user?: QuackAuthor;
};

/** What liking or unliking returns: the quack's like state for the viewer. */
export type QuackLikes = {
  likeCount: number;
  likedByMe: boolean;
};

export type QuackReply = {
  id: string;
  text: string;
  quackId: string;
  userId: string;
  createdAt: Date;
  user: QuackAuthor;
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

export type QuackStats = {
  quackCount: number;
  pollCount: number;
  voteCount: number;
};
