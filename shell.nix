{ nixpkgs ? <nixpkgs>,
  pkgs ? import nixpkgs {},
}:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs
    prettier
    typescript-language-server
  ];
}
