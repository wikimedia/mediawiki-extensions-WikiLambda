<!--
	WikiLambda Vue component for each Function Metadata Item.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<li class="ext-wikilambda-app-function-metadata-item">
		<span class="ext-wikilambda-app-function-metadata-item__title">{{
			item.title }}</span>{{ $i18n( 'colon-separator' ).text() }}
		<template v-if="item.data">
			<a
				v-if="item.data.type === METADATA_CONTENT_TYPE.LINK"
				:href="item.data.url"
				:lang="item.data.lang"
				:dir="item.data.dir"
				target="_blank"
			>{{ item.data.value }}</a>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<span v-else-if="item.data.type === METADATA_CONTENT_TYPE.HTML" v-html="item.data.value"></span>
			<span v-else-if="item.data.type === METADATA_CONTENT_TYPE.TEXT">{{ item.data.value }}</span>
		</template>
		<ul v-if="item.content" class="ext-wikilambda-app-function-metadata-item__content">
			<wl-function-metadata-item
				v-for="( subitem, subindex ) in item.content"
				:key="`${ keyString }-${ subindex }`"
				:key-string="`${ keyString }-${ subindex }`"
				:item="subitem"
			></wl-function-metadata-item>
		</ul>
	</li>
</template>

<script>
const { defineComponent } = require( 'vue' );

const Constants = require( '../../../Constants.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-metadata-item',
	components: {
		'wl-function-metadata-item': this
	},
	props: {
		keyString: {
			type: String,
			required: true
		},
		item: {
			type: Object,
			required: true
		}
	},
	data: function () {
		return {
			METADATA_CONTENT_TYPE: Constants.METADATA_CONTENT_TYPE
		};
	}
} );
</script>
