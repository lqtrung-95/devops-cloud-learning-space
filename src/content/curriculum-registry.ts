import type { ModuleDefinition } from "./content-types";
import { m01LinuxShellModule } from "./modules/m01-linux-shell/module-meta";

/** All modules in learning order. Add new modules here after creating their folder. */
export const curriculumModules: ModuleDefinition[] = [m01LinuxShellModule];
