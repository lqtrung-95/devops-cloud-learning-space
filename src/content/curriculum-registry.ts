import type { ModuleDefinition } from "./content-types";
import { m01LinuxShellModule } from "./modules/m01-linux-shell/module-meta";
import { m02NetworkingModule } from "./modules/m02-networking/module-meta";
import { m04DockerContainersModule } from "./modules/m04-docker-containers/module-meta";
import { m06AwsCoreIamModule } from "./modules/m06-aws-core-iam/module-meta";
import { m07AwsNetworkingComputeModule } from "./modules/m07-aws-networking-compute/module-meta";

/** All modules in learning order. Add new modules here after they pass `pnpm validate:module`. */
export const curriculumModules: ModuleDefinition[] = [m01LinuxShellModule, m02NetworkingModule, m04DockerContainersModule, m06AwsCoreIamModule, m07AwsNetworkingComputeModule];
