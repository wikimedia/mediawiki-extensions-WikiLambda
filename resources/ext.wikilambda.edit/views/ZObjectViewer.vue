<template>
	<!--
		WikiLambda Vue interface module for top-level view encapsulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO (T300537): Add a loading indicator, once T300538 is done upstream. -->
	<div id="ext-wikilambda-view">
		<wl-z-object
			:persistent="true"
		></wl-z-object>
		<div v-if="displaySuccessMessage" class="ext-wikilambda-view__message">
			<cdx-message
				class="ext-wikilambda-view__message__success"
				:auto-dismiss="true"
				type="success"
			>
				{{ $i18n( 'wikilambda-publish-successful' ).text() }}
			</cdx-message>
		</div>
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
var CdxMessage = require( '@wikimedia/codex' ).CdxMessage;

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-viewer',
	components: {
		'wl-z-object': ZObject,
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage
	},
	computed: {
		displaySuccessMessage: function () {
			if ( mw.Uri().query ) {
				return mw.Uri().query.success === 'true';
			}
			return false;
		}
	},
	mounted: function () {
		this.$emit( 'mounted' );
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

.ext-wikilambda-view {
	&__message {
		display: flex;
		align-items: center;
		flex-direction: column;
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;

		&__success {
			max-width: 100%;
		}
	}
}
</style>
