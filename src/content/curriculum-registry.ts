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
import { sd01SystemDesignMindsetModule } from "./modules/sd01-system-design-mindset/module-meta";
import { sd02NetworkingCommunicationModule } from "./modules/sd02-networking-communication/module-meta";
import { sd03ScalingLoadBalancingModule } from "./modules/sd03-scaling-load-balancing/module-meta";
import { sd04CachingCdnModule } from "./modules/sd04-caching-cdn/module-meta";
import { sd05DatabaseFundamentalsModule } from "./modules/sd05-database-fundamentals/module-meta";
import { sd06ScalingDatabasesModule } from "./modules/sd06-scaling-databases/module-meta";
import { sd07AsyncMessagingModule } from "./modules/sd07-async-messaging/module-meta";
import { sd08StorageSearchModule } from "./modules/sd08-storage-search/module-meta";
import { sd09ConsistencyReplicationModule } from "./modules/sd09-consistency-replication/module-meta";
import { sd10ConsensusCoordinationModule } from "./modules/sd10-consensus-coordination/module-meta";
import { sd11ReliabilityPatternsModule } from "./modules/sd11-reliability-patterns/module-meta";
import { sd12MicroservicesApiDesignModule } from "./modules/sd12-microservices-api-design/module-meta";
import { sd13SloCapacityMultiRegionModule } from "./modules/sd13-slo-capacity-multi-region/module-meta";
import { sd16CaseChatPresenceModule } from "./modules/sd16-case-chat-presence/module-meta";

/** All modules of every course (order within a course comes from `module.order`). Add modules after they pass `pnpm validate:module`. */
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
  sd01SystemDesignMindsetModule,
  sd02NetworkingCommunicationModule,
  sd03ScalingLoadBalancingModule,
  sd04CachingCdnModule,
  sd05DatabaseFundamentalsModule,
  sd06ScalingDatabasesModule,
  sd07AsyncMessagingModule,
  sd08StorageSearchModule,
  sd09ConsistencyReplicationModule,
  sd10ConsensusCoordinationModule,
  sd11ReliabilityPatternsModule,
  sd12MicroservicesApiDesignModule,
  sd13SloCapacityMultiRegionModule,
  sd16CaseChatPresenceModule,
];
