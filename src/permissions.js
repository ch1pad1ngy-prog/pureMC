function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  const staffRoleId = process.env.STAFF_ROLE_ID;
  if (staffRoleId && member.roles.cache.has(staffRoleId)) return true;
  return false;
}

module.exports = { isStaff };
