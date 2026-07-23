{
  nixpkgs ? <nixpkgs>,
  system ? builtins.currentSystem,
  pkgs ? import nixpkgs { inherit system; },
}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nixd
    nixfmt
  ];

  packages = with pkgs; [
    nodejs
    prettier
    typescript-language-server
  ];
}
