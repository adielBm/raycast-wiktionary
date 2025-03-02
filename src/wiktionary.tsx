import { Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import TurndownService from "turndown";

export default function Wiktionary(props: { arguments: { title: string } }) {
    const [content, setContent] = useState<string>("");
    const { title } = props.arguments;

    const apiUrl = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(title)}`;

    const { data: jsonData, isLoading, error } = useFetch(apiUrl);

    useEffect(() => {
        if (!jsonData) return;

        try {
            // Parse the API response
            const apiData = jsonData as any;
        
            const td = new TurndownService();

            // remove links
            td.addRule('remove-links', {
                filter: ['a'],
                replacement: function (content) {
                    return content
                }
            })

            let markdown = "";
            apiData["en"].forEach((item: { partOfSpeech: any; definitions: any[]; }) => {
                markdown += `\n## ${item.partOfSpeech}\n`;
                item.definitions.forEach((definition) => {
                    // markdown += `${definition.definition}\n\n`;
                    markdown += `\n- ${td.turndown(definition.definition)}\n`;
                    if (definition.parsedExamples) {
                        definition.parsedExamples.forEach((example: { example: string | TurndownService.Node; }) => {
                            markdown += `\n\t- _${td.turndown(example.example)}_`;
                        });
                    }
                });
            });

            setContent(markdown);
        } catch (err) {
            console.error("Error processing API data:", err);
        }
    }, [jsonData]);



    if (isLoading) {
        return <Detail isLoading={true} markdown="Loading Wiktionary data..." />;
    }

    if (error) {
        return <Detail isLoading={true} markdown="error" />;
    }

    return <Detail
        markdown={`# ${title}\n\n${content}`}
        navigationTitle={`Wiktionary: ${title}`}
    />;
}