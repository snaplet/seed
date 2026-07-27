{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
    devenv.url = "github:cachix/devenv";
    devenv.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, devenv, systems, ... } @ inputs:
    let
      forEachSystem = nixpkgs.lib.genAttrs (import systems);
    in
    {
      packages = forEachSystem (system: {
        devenv-up = self.devShells.${system}.default.config.procfileScript;
      });

      devShells = forEachSystem
        (system:
          let
            pkgs = nixpkgs.legacyPackages.${system};
          in
          {
            default = devenv.lib.mkShell {
              inherit inputs pkgs;
              modules = [
                {
                  packages = [
                    pkgs.git
                  ];

                  languages.javascript = {
                    enable = true;
                    package = pkgs.nodejs_20;
                    corepack.enable = true;
                  };

                  services.mysql = {
                    enable = true;
                    package = pkgs.mysql80;
                    settings = {
                      mysqld = {
                        interactive_timeout = 28800;
                        port = 6033;
                        wait_timeout = 28800;
                      };
                    };
                  };

                  services.postgres = {
                    enable = true;
                    package = pkgs.postgresql_16;
                    settings = {
                      max_connections = 300;
                      shared_buffers = "4GB";
                    };
                    listen_addresses = "localhost";
                    port = 2345;
                    initialScript = ''
                      CREATE USER postgres SUPERUSER;
                    '';
                  };
                }
              ];
            };
          });
    };
}
