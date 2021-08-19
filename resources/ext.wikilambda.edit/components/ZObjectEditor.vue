<template>
	<!--
		WikiLambda Vue interface module for top-level editor encapsulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO: Add a loading indicator, once T254695 is done upstream. -->
	<div id="ext-wikilambda-editor">
		<z-object
			:persistent="true"
			@input="updateZobject"
		></z-object>
		<div
			v-if="showSaveCommand"
			class="ext-wikilambda-publishControl">
			<!-- TODO: Replace this with a full save dialog (copywarn, IPwarn, minor edit box, …)? -->
			<sd-button
				:primary="true"
				:progressive="true"
				:framed="true"
				@click="submit">
				{{ submitButtonLabel }}
			</sd-button>
			<label
				class="ext-wikilambda-editSummary-label"
				for="summary"> {{ $i18n( 'wikilambda-summarylabel' ) }}
			</label>
			<input v-model="summary"
				class="ext-wikilambda-editSummary"
				:placeholder="submitButtonDescriptionPrompt"
				name="summary"
			>
		</div>
		<sd-button
			class="ext-wikilambda-expertModeToggle"
			@click="$store.dispatch( 'toggleExpertMode' )">
			<template v-if="$store.getters.isExpertMode">
				{{ $i18n( 'wikilambda-disable-expert-mode' ) }}
			</template>
			<template v-else>
				{{ $i18n( 'wikilambda-enable-expert-mode' ) }}
			</template>
		</sd-button>
		<sd-message v-if="message.text" :type="message.type">
			{{ message }}
		</sd-message>
	</div>
</template>

<script>
var ZObject = require( './ZObject.vue' ),
	SdButton = require( './base/Button.vue' ),
	SdMessage = require( './base/Message.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectJson = require( './ZObjectJson.vue' );

module.exports = {
	name: 'ZObjectEditor',
	components: {
		'z-object': ZObject,
		'sd-button': SdButton,
		'sd-message': SdMessage,
		'z-object-json': ZObjectJson
	},
	data: function () {
		return {
			summary: ''
		};
	},
	computed: $.extend( mapGetters( {
		createNewPage: 'isCreateNewPage',
		message: 'getZObjectMessage',
		ZObjectJson: 'getZObjectAsJson'
	} ), {
		submitButtonLabel: function () {
			if ( this.createNewPage ) {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishnew' : 'wikilambda-savenew'
				);
			} else {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishchanges' : 'wikilambda-savechanges'
				);
			}
		},
		submitButtonDescriptionPrompt: function () {
			return this.$i18n( 'wikilambda-publish-summary-prompt' );
		},
		showSaveCommand: function () {
			// TODO: Move this into its own vuex store as things gets more complicated and more view settigns are set
			// we currently hide the save command for evaluate function call.
			return mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'EvaluateFunctionCall';
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'initialize', 'submitZObject' ] ),
		{
			updateZobject: function ( newZobject ) {
				this.zobject = newZobject;
			},

			submit: function () {
				this.submitZObject( this.summary );
			}
		}
	),

	created: function () {
		this.initialize();
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import './../../lib/sd-base-variables.less';
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-publishControl {
	// Be as wide as possible!
	.flex( 1, 1, auto, 0 );
	// … but not too wide
	max-width: 50em;

	.ext-wikilambda-editSummary {
		min-width: 25em;
		box-shadow: inset 0 0 0 1px transparent;
		.transition( ~'border-color 250ms, box-shadow 250ms' );
		background-color: @background-color-base;
		border: @border-width-base @border-style-base @border-color-base;
		border-radius: @border-radius-base;
		box-sizing: border-box;
		color: @color-base--emphasized;
		font-size: inherit;
		height: @sd-size-base;
		line-height: @sd-line-height-base;

		&::placeholder {
			color: @color-placeholder;
			opacity: 1;
		}
	}
}

.ext-wikilambda-expertModeToggle {
	margin: 1em 0 0 0;
}

.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
