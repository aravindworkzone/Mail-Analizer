import { Client } from '@notionhq/client';
import 'dotenv/config';

if (!process.env.NOTION_TOKEN) {
  throw new Error('NOTION_TOKEN missing in .env');
}

export const notion = new Client({ auth: process.env.NOTION_TOKEN });
