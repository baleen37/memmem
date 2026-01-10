{
  description = "Claude Plugins Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bats-assert.url = "github:bats-core/bats-assert";
    bats-assert.flake = false;
    bats-support.url = "github:bats-core/bats-support";
    bats-support.flake = false;
  };

  outputs = { self, nixpkgs, flake-utils, bats-assert, bats-support }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bash
            jq
            bats
            shellcheck
          ];

          BATS_ASSERT_SRC = bats-assert;
          BATS_SUPPORT_SRC = bats-support;

          shellHook = ''
            export BATS_LIB="${pkgs.bats}/lib/bats"
            export BATS_SUPPORT_LIB="${bats-support}"
            export BATS_ASSERT_LIB="${bats-assert}"

            echo "✓ Development environment loaded"
            echo "  - bats: $(bats --version)"
            echo "  - jq: $(jq --version)"
            echo "  - shellcheck: $(shellcheck --version | head -1)"
          '';
        };
      });
}
