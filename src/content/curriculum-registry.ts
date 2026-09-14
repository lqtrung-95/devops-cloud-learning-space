import type { ModuleDefinition } from "./content-types";
import { m01LinuxShellModule } from "./modules/m01-linux-shell/module-meta";
import { m02NetworkingModule } from "./modules/m02-networking/module-meta";
import { m03DevopsMindsetGitModule } from "./modules/m03-devops-mindset-git/module-meta";
import { m04DockerContainersModule } from "./modules/m04-docker-containers/module-meta";
import { m05CicdGithubActionsModule } from "./modules/m05-cicd-github-actions/module-meta";
import { m06AwsCoreIamModule } from "./modules/m06-aws-core-iam/module-meta";
import { m07AwsNetworkingComputeModule } from "./modules/m07-aws-networking-compute/module-meta";
import { m08AwsStorageDatabaseServerlessModule } from "./modules/m08-aws-storage-database-serverless/module-meta";
import { m09AwsWellArchitectedCostModule } from "./modules/m09-aws-well-architected-cost/module-meta";
import { m10TerraformModule } from "./modules/m10-terraform/module-meta";
import { m11AnsiblePackerModule } from "./modules/m11-ansible-packer/module-meta";
import { m12KubernetesCoreModule } from "./modules/m12-kubernetes-core/module-meta";
import { m13KubernetesProductionEksModule } from "./modules/m13-kubernetes-production-eks/module-meta";
import { m14GitopsArgocdModule } from "./modules/m14-gitops-argocd/module-meta";
import { m15ObservabilityModule } from "./modules/m15-observability/module-meta";
import { m16SrePracticesModule } from "./modules/m16-sre-practices/module-meta";
import { m17DevsecopsModule } from "./modules/m17-devsecops/module-meta";

/** All modules in learning order. Add new modules here after they pass `pnpm validate:module`. */
export const curriculumModules: ModuleDefinition[] = [
  m01LinuxShellModule,
  m02NetworkingModule,
  m03DevopsMindsetGitModule,
  m04DockerContainersModule,
  m05CicdGithubActionsModule,
  m06AwsCoreIamModule,
  m07AwsNetworkingComputeModule,
  m08AwsStorageDatabaseServerlessModule,
  m09AwsWellArchitectedCostModule,
  m10TerraformModule,
  m11AnsiblePackerModule,
  m12KubernetesCoreModule,
  m13KubernetesProductionEksModule,
  m14GitopsArgocdModule,
  m15ObservabilityModule,
  m16SrePracticesModule,
  m17DevsecopsModule,
];
