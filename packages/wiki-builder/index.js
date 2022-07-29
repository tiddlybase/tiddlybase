const getTiddlyWikiInfo = () => ({
    // TODO: get config, plugins and included wikis from tiddlybase config
    "description": "Empty tiddlybase edition",
    "includeWikis": [
		{"path": "../../../csaladi_naplo/headless", "read-only": true}
	],
    "config": {
        "default-storage-prefix": "csaladwiki/files",
        "display-link-icons": true
    },
    "plugins": [
        "tiddlywiki/codemirror",
        "tiddlybase/tiddlybase-utils",
        "tiddlybase/react",
        "tiddlybase/embed-media",
        "tiddlybase/mdx"
    ],
    "themes": [
        "tiddlywiki/vanilla",
    ],
    "build": {
        "wiki.html": [
            "--rendertiddler",
            "$:/core/save/all",
            "wiki.html",
            "text/plain"
        ],
        "wiki.json": [
            "--savejson",
            "wiki.json"
        ]
    }
})

if (require.main === module) {
   console.log(JSON.stringify(getTiddlyWikiInfo(), null, 4)) 
}

module.exports = {getTiddlyWikiInfo};
