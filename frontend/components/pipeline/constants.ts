import { type LucideIcon, Link2Icon } from 'lucide-react';
import {
  NotionIcon,
  SalesforceIcon,
  SlackIcon,
  ConfluenceIcon,
  GitHubIcon,
  GoogleDriveIcon,
  GmailIcon,
  JiraIcon,
  HubSpotIcon,
  ZendeskIcon,
  DropboxIcon,
  IntercomIcon,
  AirtableIcon,
  TrelloIcon,
} from '@/components/icons/data-source-icons';

export type DataSourceType =
  | 'url'
  | 'notion'
  | 'google-drive'
  | 'gmail'
  | 'salesforce'
  | 'slack'
  | 'confluence'
  | 'jira'
  | 'github'
  | 'hubspot'
  | 'zendesk'
  | 'dropbox'
  | 'intercom'
  | 'airtable'
  | 'trello';

export type IconComponent = LucideIcon | React.ComponentType<{ className?: string }>;

export interface DataSourceConfig {
  value: DataSourceType;
  label: string;
  icon: IconComponent;
  placeholder: string;
  available: boolean;
}

export const DATA_SOURCES: DataSourceConfig[] = [
  {
    value: 'url',
    label: 'URL',
    icon: Link2Icon,
    placeholder: 'https://docs.example.com',
    available: true,
  },
  {
    value: 'notion',
    label: 'Notion',
    icon: NotionIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'google-drive',
    label: 'Google Drive',
    icon: GoogleDriveIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'gmail',
    label: 'Gmail',
    icon: GmailIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'salesforce',
    label: 'Salesforce',
    icon: SalesforceIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'slack',
    label: 'Slack',
    icon: SlackIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'hubspot',
    label: 'HubSpot',
    icon: HubSpotIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'confluence',
    label: 'Confluence',
    icon: ConfluenceIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'jira',
    label: 'Jira',
    icon: JiraIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'zendesk',
    label: 'Zendesk',
    icon: ZendeskIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'github',
    label: 'GitHub',
    icon: GitHubIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'dropbox',
    label: 'Dropbox',
    icon: DropboxIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'intercom',
    label: 'Intercom',
    icon: IntercomIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'airtable',
    label: 'Airtable',
    icon: AirtableIcon,
    placeholder: '',
    available: false,
  },
  {
    value: 'trello',
    label: 'Trello',
    icon: TrelloIcon,
    placeholder: '',
    available: false,
  },
];
