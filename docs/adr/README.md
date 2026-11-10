# Architecture Decision Records

Decisions that are hard to undo or affect more than one feature. Read the relevant ADR before changing the data model or the app structure; write a new one when you make such a decision.

- **0001** · [Deleted content becomes a tombstone](0001-delete-content-as-tombstone.md) · Accepted · Deleting a quack keeps the row for its replies but wipes its text, mood and polls and sets `deletedAt`; every read of quacks respects it.
