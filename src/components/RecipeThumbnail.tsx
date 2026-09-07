"use client";

import { useState } from "react";

import { getRecipeEmoji, getRecipeGradient } from "../lib/recipe-emojis";

/**
 * Bandeau illustrant une recette.
 *
 * Photo Unsplash si la recette en a une, sinon un dégradé déduit du titre
 * portant l'icône du plat. Le repli n'est pas qu'un placeholder d'attente :
 * il reste affiché pour toute recette qu'Unsplash ne sait pas illustrer, et
 * prend le relais si l'image distante échoue à charger.
 */
export default function RecipeThumbnail({
  title,
  imageUrl,
  creditName,
  creditUrl,
  license,
  height = 150,
}: {
  title: string;
  imageUrl?: string | null;
  creditName?: string | null;
  creditUrl?: string | null;
  license?: string | null;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(imageUrl) && !failed;

  return (
    <div
      style={{
        position: "relative",
        height: `${height}px`,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: getRecipeGradient(title),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {showPhoto ? (
        <>
          {/*
            <img> et non next/image : l'optimiseur de Vercel est facturé sur le
            plan Hobby, alors qu'Unsplash sert déjà l'image au bon format via
            les paramètres d'URL. eslint-disable-next-line @next/next/no-img-element
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl!}
            alt={title}
            loading="lazy"
            onError={() => setFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {creditName && (
            <a
              href={creditUrl ?? "https://openverse.org"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              // Les licences Creative Commons imposent de citer l'auteur ET la
              // licence : le badge porte les deux, et renvoie à la source.
              title={`Photo de ${creditName}${license ? ` — ${license}` : ""}`}
              style={{
                position: "absolute",
                right: "0.35rem",
                bottom: "0.35rem",
                background: "rgba(0, 0, 0, 0.55)",
                color: "#fff",
                fontSize: "0.62rem",
                padding: "0.1rem 0.4rem",
                borderRadius: "999px",
                textDecoration: "none",
                maxWidth: "85%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              📷 {creditName}
              {license ? ` · ${license}` : ""}
            </a>
          )}
        </>
      ) : (
        <span style={{ fontSize: `${Math.round(height / 2.6)}px`, lineHeight: 1 }} aria-hidden="true">
          {getRecipeEmoji(title)}
        </span>
      )}
    </div>
  );
}
