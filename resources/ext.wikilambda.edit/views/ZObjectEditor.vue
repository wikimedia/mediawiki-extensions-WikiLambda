<template>
	<!--
		WikiLambda Vue interface module for top-level editor encapsulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO (T300537): Add a loading indicator, once T300538 is done upstream. -->
	<div id="ext-wikilambda-editor">
		<z-object
			:persistent="true"
			@input="updateZobject"
		></z-object>
		<template v-if="showEditCommand">
			<div
				class="ext-wikilambda-publishControl">
				<!-- TODO (T270304): Replace this with a full save dialog (copywarn, IPwarn, minor edit box, …)? -->
				<cdx-button
					:primary="true"
					:progressive="true"
					:framed="true"
					:disabled="!currentZObjectHasLabel"
					@click="submit">
					{{ submitButtonLabel }}
				</cdx-button>
				<label
					class="ext-wikilambda-editSummary-label"
					for="summary"> {{ $i18n( 'wikilambda-summarylabel' ).text() }}
				</label>
				<input
					v-model="summary"
					class="ext-wikilambda-editSummary"
					:placeholder="submitButtonDescriptionPrompt"
					name="summary"
				>
			</div>
			<cdx-button
				v-if="isNewZObject"
				@click="navigateToFunctionEditor( Constants.Z_FUNCTION )">
				{{ $i18n( 'wikilambda-create-function' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="isNewZObject"
				@click="changePersistentObjectValue( Constants.Z_TYPE )">
				{{ $i18n( 'wikilambda-create-type' ).text() }}
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-expertModeToggle"
				@click="$store.dispatch( 'toggleExpertMode' )">
				<template v-if="$store.getters.isExpertMode">
					{{ $i18n( 'wikilambda-disable-expert-mode' ).text() }}
				</template>
				<template v-else>
					{{ $i18n( 'wikilambda-enable-expert-mode' ).text() }}
				</template>
			</cdx-button>
			<cdx-message v-if="message.text" :type="message.type">
				{{ message }}
			</cdx-message>
		</template>
	</div>
</template>

<script>
var ZObject = require( '../components/ZObject.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'z-object-editor',
	components: {
		'z-object': ZObject,
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage
	},
	mixins: [ typeUtils ],
	data: function () {
		return {
			summary: '',
			Constants: Constants
		};
	},
	computed: $.extend( mapGetters( {
		createNewPage: 'isCreateNewPage',
		message: 'getZObjectMessage',
		currentZObjectHasLabel: 'currentZObjectHasLabel',
		isNewZObject: 'isNewZObject',
		getZObjectChildrenById: 'getZObjectChildrenById'
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
			return this.$i18n( 'wikilambda-publish-summary-prompt' ).text();
		},
		showEditCommand: function () {
			// TODO: Move this into its own vuex store as things gets more complicated and more view settings are set
			// we currently hide the save command for evaluate function call.
			return mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'EvaluateFunctionCall';
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'submitZObject', 'changeType' ] ),
		mapActions( 'router', [ 'navigate' ] ),
		{
			updateZobject: function ( newZobject ) {
				this.zobject = newZobject;
			},

			submit: function () {
				this.submitZObject( this.summary ).then( function ( pageTitle ) {
					if ( pageTitle ) {
						window.location.href = new mw.Title( pageTitle ).getUrl();
					}
				} );
			},

			changePersistentObjectValue: function ( type ) {
				var zObject = this.getZObjectChildrenById( 0 ); // We fetch the Root object
				var Z2K2 =
					this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, zObject );

				return this.changeType( {
					id: Z2K2.id,
					type: type
				} );
			},
			navigateToFunctionEditor: function () {
				this.changePersistentObjectValue( Constants.Z_FUNCTION ).then( function () {
					this.navigate( { to: Constants.VIEWS.FUNCTION_EDITOR } );
				}.bind( this ) );

			}
		}
	)
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
