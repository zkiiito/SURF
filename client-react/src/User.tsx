// @ts-ignore
function User({ user }) {
  return (
    <img
      className={user.status}
      src={user.avatar}
      alt={user.name}
      title={user.name}
    />
  )
}

export default User
