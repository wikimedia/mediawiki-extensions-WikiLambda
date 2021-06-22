<template>
	<!--
		WikiLambda Vue component for ZObject references to ZImplementations in ZLists.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<li class="ext-wikilambda-zlistItem">
		<button v-if="!(viewmode || readonly)"
			:title="tooltipRemoveListItem"
			@click="removeItem"
		>
			{{ $i18n( 'wikilambda-editor-removeitem' ) }}
		</button>
		<z-reference
			:zobject-id="zobjectId"
			:search-type="zType"
		></z-reference>
	</li>
</template>

<script>
var ZListItem = require( './ZListItem.vue' ),
	ZReference = require( './ZReference.vue' );

module.exports = {
	extends: ZListItem,
	components: {
		'z-reference': ZReference
	}
};
</script>
