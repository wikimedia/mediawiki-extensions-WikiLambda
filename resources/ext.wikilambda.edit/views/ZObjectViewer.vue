<template>
	<!--
		WikiLambda Vue interface module for top-level view encapsulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO (T300537): Add a loading indicator, once T300538 is done upstream. -->
	<div id="ext-wikilambda-view">
		<z-object
			:persistent="true"
		></z-object>
		<cdx-button @click="$store.dispatch( 'toggleExpertMode' )">
			<template v-if="$store.getters.isExpertMode">
				{{ $i18n( 'wikilambda-disable-expert-mode' ).text() }}
			</template>
			<template v-else>
				{{ $i18n( 'wikilambda-enable-expert-mode' ).text() }}
			</template>
		</cdx-button>
	</div>
</template>

<script>
var ZObject = require( '../components/ZObject.vue' );
var CdxButton = require( '@wikimedia/codex' ).CdxButton;

// @vue/component
module.exports = exports = {
	name: 'z-object-viewer',
	components: {
		'z-object': ZObject,
		'cdx-button': CdxButton
	}
};
</script>

<style lang="less">
.ext-wikilambda-view-nojsfallback {
	display: none;
}

.ext-wikilambda-view-nojswarning {
	font-weight: bold;
	margin-bottom: 1em;
}
</style>
