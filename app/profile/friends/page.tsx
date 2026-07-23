import ProfilePlaceholderPage from "@/components/ProfilePlaceholderPage";

export default function ProfileFriendsPage() {
  return (
    <ProfilePlaceholderPage
      eyebrow="Friends"
      title="Cube Friends"
      description="The approved version will handle friend requests, blocks, direct challenges, and online friend activity with server-side privacy checks."
      primaryHref="/profile/challenges"
      primaryLabel="Open challenges"
    />
  );
}
