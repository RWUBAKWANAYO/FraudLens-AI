import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

const users = [
  {
    name: "John Doe",
    email: "8wK4l@example.com",
    createdAt: "Aug 20, 2025",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
  {
    name: "Jane Doe",
    email: "8wK4l@example.com",
    createdAt: "Sep 07, 2025",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
  {
    name: "John Doe",
    email: "8wK4l@example.com",
    createdAt: "Jan 03, 2025",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
  {
    name: "Jane Doe",
    email: "8wK4l@example.com",
    createdAt: "May 08, 2025",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
  {
    name: "John Doe",
    email: "8wK4l@example.com",
    createdAt: "Dec 21, 2025",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
];

export function RecentUsers() {
  return (
    <div className="p-6 bg-foreground shadow-sm rounded-lg h-full ">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recent members</h2>
        <Button className="colored-button text-colored-primary shadow-none bg-transparent font-semibold">
          View All
        </Button>
      </div>
      {users.map((user) => (
        <div
          className="mb-2 pb-4 shadow-sm border-b rounded border-accent flex justify-between"
          key={user.createdAt + user.email}
        >
          <div className="flex flex-row items-center gap-x-4">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover h-10 w-10 rounded-full"
              />
              <AvatarFallback className="p-3 rounded-full text-primary font-bold bg-accent">
                JD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">{user.name}</p>
              <p className="text-xs text-gray-500 text-primary-foreground">{user.email}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-primary-foreground">{user.createdAt}</p>
        </div>
      ))}
    </div>
  );
}
