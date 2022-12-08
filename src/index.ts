/**
 * Welcome to Cloudflare Workers! This is your first scheduled worker.
 *
 * - Run `wrangler dev --local` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
 * - Go back to the console to see what your worker has logged
 * - Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)
 * - Run `wrangler publish --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
 */

export interface Env {
    DISCORD_API_TOKEN: string;
    DISCORD_GUILD_ID: string;
    DISCORD_ANNOUNCEMENTS_CHANNEL_ID: string;
}

export interface ScheduledEvent {
    id: string;
    name: string;
    description?: string;
    scheduled_start_time: string;
}

export default {
    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        console.log(`Starting the bot...`);
        if (
            env.DISCORD_API_TOKEN === null ||
            env.DISCORD_API_TOKEN.length === 0
        ) {
            throw new Error(`Failed to find Discord API token`);
        }
        if (
            env.DISCORD_GUILD_ID === null ||
            env.DISCORD_GUILD_ID.length === 0
        ) {
            throw new Error(`Failed to find Discord guild ID`);
        }
        if (env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID === null) {
            throw new Error(`Failed to find Discord announcements channel ID`);
        }

        const scheduled_events_url = `https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/scheduled-events`;

        const scheduled_events_response = await fetch(scheduled_events_url, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${env.DISCORD_API_TOKEN}`,
            },
        });
        if (!scheduled_events_response.ok) {
            const error = await scheduled_events_response.text();
            throw new Error(`Failed to get scheduled events: ${error}`);
        }
        const scheduled_events_json =
            (await scheduled_events_response.json()) as ScheduledEvent[];
        const now = new Date();
        const tomorrow = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
        );
        const messages = scheduled_events_json.map((event) => {
            const event_date = new Date(event.scheduled_start_time);
            if (
                tomorrow.getFullYear() == event_date.getFullYear() &&
                tomorrow.getMonth() == event_date.getMonth() &&
                tomorrow.getDate() == event_date.getDate()
            ) {
                console.log(`Posting message for event ${event.name}`);
                return this.message(event, env);
            } else {
                console.log(
                    `Skipping event ${event.name} since it's not tomorrow`
                );
            }
        });
        await Promise.all(messages);
    },
    async message(event: ScheduledEvent, env: Env): Promise<void> {
        const message_announcements_url = `https://discord.com/api/v10/channels/${env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID}/messages`;
        let content = `"${event.name}" is coming up tomorrow!`;
        if (event.description != null) {
            content += ` Here's the description:\n${event.description}`;
        }
        const message_response = await fetch(message_announcements_url, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${env.DISCORD_API_TOKEN}`,
            },
            method: "POST",
            body: JSON.stringify({
                content: content,
            }),
        });
        if (!message_response.ok) {
            const error = await message_response.text();
            throw new Error(`Failed to get post message: ${error}`);
        }
    },
};
