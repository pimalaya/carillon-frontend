{
  description = "Carillon frontend";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };

      in
      {
        devShells.default = import ./shell.nix {
          inherit nixpkgs system pkgs;
        };

        # The built dashboard (a static `dist/`), for serving same-origin from
        # carillon-backend via `api.ui_dir`. `nix build` -> ./result = the dist.
        packages.default = pkgs.buildNpmPackage {
          pname = "carillon-frontend";
          version = "0.1.0";
          src = ./.;
          npmDepsHash = "sha256-Gh/IZ2OzzgRM7VVi2ydnp9nlHXO7DYMucQ39tdgcFrY=";

          # Real-server, same-origin build: empty VITE_API_BASE_URL => relative
          # requests; mocks explicitly off (a production build disables them
          # anyway, but be explicit).
          env.VITE_ENABLE_MOCKS = "false";

          # `npm run build` == `vite build` => ./dist. Install just the static
          # output; $out IS the dist root (index.html at its top level).
          installPhase = ''
            runHook preInstall
            cp -r dist $out
            runHook postInstall
          '';

          meta.description = "Reference dashboard SPA for carillon-backend";
        };
      }
    );
}
