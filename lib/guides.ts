import { Guide } from "./schema";
import github from "@/data/guides/github.json";
import notion from "@/data/guides/notion.json";
import slack from "@/data/guides/slack.json";
import gmail from "@/data/guides/gmail.json";
import spotify from "@/data/guides/spotify.json";
import shopify from "@/data/guides/shopify.json";

// Parsing at import time: a malformed guide fails the build, not a reader's page.
export const GUIDES: Guide[] = [github, notion, slack, gmail, spotify, shopify].map((g) => Guide.parse(g));

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
