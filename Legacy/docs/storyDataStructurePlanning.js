// Original planning and thoughts from when I first wrote the legacy code; some updates to the available fields has definitely happened, and other than that I'm not sure how up-to-date or reliable this structure is, since I haven't worked with the code in a while

flatStories :
[
	{  // instances of tFlatStory
		title: "",
		author: "",
		url: "",
		content: "",
		datePosted: Date.now()
	}  // , ...
]

stories :
[
	{  // instances of tStory
		name: "",
		author: "",
		parts: 0,
		lastUpdated: Date.now(),  // when the story was last added to
		cachedOn: Date.now(),  // when this story was cached; if cachedOn<lastUpdated, then we can flag the story as updated, if desired
		chapters :  // instances of tFlatStory, minus the author property
		[
			{
				title: "",
				url: "",
				datePosted: Date.now(),
				content: "",
				readerData:
				{
					readOn: Date.now()
				}
			}
		]
	}
]