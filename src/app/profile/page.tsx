src/
  app/
    profile/
      me/
        page.tsx   <-- (Celui qui redirige vers /profile/[id])
      [id]/
        page.tsx   <-- (C'est LA page qui manquait et qui affiche le profil avec le 404)
