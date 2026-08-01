import type { GroupItem, MemberState } from '../ws/types.js';

export function getPrimaryMemberState(group: GroupItem): MemberState | undefined {
  return group.members[0]?.state;
}
