import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import TurndownService from "turndown";

export default function FullPage(props: { arguments: { title: string } }) {
  const [content, setContent] = useState<string>("");
  const { title } = props.arguments;

  const apiUrl = `https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(title)}`;

  const { data: htmlData, isLoading, error } = useFetch(apiUrl);

  useEffect(() => {
    if (!htmlData) return;

    try {
      // Parse the API response
      const apiData = htmlData as any;

      // Check if English definitions exist
      if (!apiData || apiData.length === 0) {
        setContent(`# No definition found for "${title}"`);
        return;
      }

      const td = new TurndownService();

      // Remove links
      td.addRule("remove-links", {
        filter: ["a"],
        replacement: function (content) {
          return content;
        },
      });
      const markdown = td.turndown(apiData);

      setContent(markdown);
    } catch (err) {
      console.error("Error processing API data:", err);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to process definition",
        message: "There was an error processing the definition data",
      });
      setContent(`# Error\nCould not process definition for "${title}". Please try again later.`);
    }
  }, [htmlData]);

  if (isLoading) {
    return <Detail isLoading={true} markdown={`# Looking up "${title}"...\nFetching definitions from Wiktionary`} />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\nCould not find definition for "${title}". The word may not exist in Wiktionary or there might be a network issue.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Search on Wiktionary Website"
              url={`https://en.wiktionary.org/wiki/${encodeURIComponent(title)}`}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={content}
      navigationTitle={`${title} - Wiktionary`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://en.wiktionary.org/wiki/${encodeURIComponent(title)}`}
          />
        </ActionPanel>
      }
    />
  );
}
