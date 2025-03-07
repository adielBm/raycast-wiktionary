import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import TurndownService from "turndown";
import { List } from "@raycast/api";
import fetch from 'node-fetch';

const HEADERS = { "User-Agent": "Raycast-Wiktionary-Extension" };

export default function DefineSuggestions() {
  const [text, setText] = useState<string>("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = `https://en.wiktionary.org/w/rest.php/v1/search/title?q=${text}&limit=10`;

  useEffect(() => {
    if (text.length === 0) {
      setSuggestions([]);
      return; // Don't fetch if text is empty
    }

    setIsLoading(true);
    setError(null);

    // Perform the fetch request
    fetch(apiUrl, {
      headers: HEADERS
    })
      .then((response) => response.json())
      .then((data: any) => {
        setSuggestions(data?.pages || []); // Assuming the response has 'pages' key
        setIsLoading(false);
      })
      .catch((err) => {
        setError("Failed to load suggestions.");
        setIsLoading(false);
      });
  }, [text]);

  return (
    <List
      searchBarPlaceholder="Search Wiktionary"
      onSearchTextChange={setText}
      isLoading={isLoading}
      throttle
    >
      {error && <List.Item title="Error" subtitle={error} />}
      {!error &&
        suggestions.map((page) => (
          <List.Item
            // icon={{ source: page?.thumbnail?.url || "../assets/icon.svg" }}
            icon={{ source: page?.thumbnail?.url ? 'https:' + page.thumbnail.url : "../assets/icon.svg" }}
            id={page.id.toString()}
            key={page.id}
            title={page.title}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="Show Definitions"
                  target={<Define title={page.title} />}
                />
                <Action.OpenInBrowser
                  title="Open in Wiktionary"
                  url={`https://en.wiktionary.org/wiki/${encodeURIComponent(page.title)}`}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={page.title}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}


export function Define({ title }: { title: string }) {
  const [content, setContent] = useState<string>("");

  const apiUrl = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(title.trim())}`;

  const { data: jsonData, isLoading, error } = useFetch(apiUrl, {
    headers: HEADERS
  });

  useEffect(() => {
    if (!jsonData) return;

    try {
      // Parse the API response
      const apiData = jsonData as any;

      // Check if English definitions exist
      if (!apiData["en"] || apiData["en"].length === 0) {
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

      let markdown = "";

      apiData["en"].forEach((item: { partOfSpeech: string; definitions: any[] }) => {
        markdown += `\n## ${item.partOfSpeech}\n`;

        item.definitions.forEach((definition, index) => {
          const definitionText = td.turndown(definition.definition);
          if (definitionText.length === 0) return;
          markdown += `\n${index + 1}. ${definitionText}\n`;

          if (definition.parsedExamples && definition.parsedExamples.length > 0) {
            definition.parsedExamples.forEach((example: { example: string | TurndownService.Node }) => {
              const exampleText = td.turndown(example.example);
              if (exampleText.length === 0) return;
              markdown += `\t- >*${exampleText}*\n`;
            });
          }
        });
      });

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
  }, [jsonData]);

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
      navigationTitle={`${title}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Wiktionary"
            url={`https://en.wiktionary.org/wiki/${encodeURIComponent(title)}`}
          />
        </ActionPanel>
      }
    />
  );
}
