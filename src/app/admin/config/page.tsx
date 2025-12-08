import { SystemConfigPage } from './system-config-page';
import { getSystemConfigGroupsAction } from './actions';

export default async function ConfigPage() {
  const { groups } = await getSystemConfigGroupsAction();

  return <SystemConfigPage initialGroups={groups} />;
}
