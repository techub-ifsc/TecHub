import { useState } from "react";

export default function CollaboratorAvatar({ name, profilePhotoUrl, compact = false }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);
  const initial = Array.from((name || "").trim())[0]?.toLocaleUpperCase("pt-BR") || "?";
  const showPhoto = profilePhotoUrl && profilePhotoUrl !== failedPhotoUrl;

  return (
    <span
      className={compact ? "collaborator-suggestion-avatar" : "collaborator-avatar"}
      aria-hidden="true"
    >
      {showPhoto ? (
        <img
          src={profilePhotoUrl}
          alt=""
          loading="lazy"
          onError={() => setFailedPhotoUrl(profilePhotoUrl)}
        />
      ) : initial}
    </span>
  );
}
