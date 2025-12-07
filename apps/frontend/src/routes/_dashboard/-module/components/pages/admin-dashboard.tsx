import { PageHeading } from '@frontend/components/page-heading';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@frontend/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@frontend/components/ui/item';
import { Progress } from '@frontend/components/ui/progress';
import {
  Activity,
  ArrowUp,
  CheckCircle2,
  Server,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Fragment } from 'react';

function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <PageHeading
        title="Dashboard"
        subtitle="Monitor your virtual lab platform performance and user activity"
      />

      {/* Key Metrics - Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Users */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold">1,847</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <ArrowUp className="size-3 text-green-500" />
              <span className="text-green-600 font-medium">+12.3%</span>
              <span className="text-muted-foreground">from last month</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium">289</span> Students •{' '}
              <span className="font-medium">45</span> Lecturers
            </div>
          </CardContent>
        </Card>

        {/* Active Lab Sessions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Sessions
            </CardTitle>
            <Activity className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold">89</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <TrendingUp className="size-3 text-purple-500" />
              <span className="text-purple-600 font-medium">Live Now</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Peak: <span className="font-medium">142</span> sessions today
            </div>
          </CardContent>
        </Card>

        {/* Lab Devices */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lab Devices
            </CardTitle>
            <Server className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold">342</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <ArrowUp className="size-3 text-green-500" />
              <span className="text-green-600 font-medium">+8.5%</span>
              <span className="text-muted-foreground">new devices</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium">268</span> MikroTik •{' '}
              <span className="font-medium">74</span> Other
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Health
            </CardTitle>
            <CheckCircle2 className="size-4 text-green-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold">98.7%</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-green-600 font-medium">Excellent</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Uptime: <span className="font-medium">29d 14h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Wider */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-purple-500" />
                Recent Lab Activity
              </CardTitle>
              <CardDescription>
                Latest sessions and user interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ItemGroup>
                {[
                  {
                    user: 'John Doe',
                    action: 'started',
                    course: 'Network Administration',
                    lab: 'MikroTik Basic Routing',
                    time: '2 min ago',
                    status: 'active',
                  },
                  {
                    user: 'Sarah Wilson',
                    action: 'completed',
                    course: 'Network Security',
                    lab: 'Firewall Configuration',
                    time: '8 min ago',
                    status: 'completed',
                  },
                  {
                    user: 'Mike Johnson',
                    action: 'started',
                    course: 'Network Security',
                    lab: 'VPN Setup & Security',
                    time: '15 min ago',
                    status: 'active',
                  },
                  {
                    user: 'Emily Davis',
                    action: 'terminated',
                    course: 'Advanced Networking',
                    lab: 'Advanced Routing Protocols',
                    time: '23 min ago',
                    status: 'terminated',
                  },
                  {
                    user: 'Alex Turner',
                    action: 'completed',
                    course: 'Network Design',
                    lab: 'Network Topology Design',
                    time: '31 min ago',
                    status: 'completed',
                  },
                ].map((activity, index, array) => (
                  <Fragment key={index}>
                    <Item size="sm">
                      <ItemContent>
                        <ItemTitle>{activity.user}</ItemTitle>
                        <ItemDescription>
                          <span
                            className={
                              activity.status === 'active'
                                ? 'text-green-600 dark:text-green-400 font-medium'
                                : activity.status === 'completed'
                                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                                  : 'text-gray-600 dark:text-gray-400 font-medium'
                            }
                          >
                            {activity.action === 'started'
                              ? 'Started'
                              : activity.action === 'completed'
                                ? 'Completed'
                                : 'Terminated'}
                          </span>
                          {' • '}
                          {activity.course} - {activity.lab}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <span className="ml-auto text-xs text-muted-foreground font-normal">
                          {activity.time}
                        </span>
                      </ItemActions>
                    </Item>
                    {index < array.length - 1 && <ItemSeparator />}
                  </Fragment>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Popular Labs */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Popular Labs</CardTitle>
              <CardDescription>Most accessed this week</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ItemGroup>
                {[
                  {
                    course: 'Network Administration',
                    lab: 'MikroTik Basic Routing',
                    count: 234,
                  },
                  {
                    course: 'Network Security',
                    lab: 'Firewall Configuration',
                    count: 198,
                  },
                  {
                    course: 'Network Security',
                    lab: 'VPN Setup & Security',
                    count: 167,
                  },
                  {
                    course: 'Network Design',
                    lab: 'Network Topology Design',
                    count: 143,
                  },
                ].map((lab, index, array) => (
                  <Fragment key={index}>
                    <Item size="sm">
                      <ItemContent>
                        <ItemTitle>{lab.lab}</ItemTitle>
                        <ItemDescription>{lab.course}</ItemDescription>
                      </ItemContent>
                      <ItemActions>{lab.count}</ItemActions>
                      <ItemFooter>
                        <Progress value={(lab.count / 234) * 100} />
                      </ItemFooter>
                    </Item>
                    {index < array.length - 1 && <ItemSeparator />}
                  </Fragment>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
