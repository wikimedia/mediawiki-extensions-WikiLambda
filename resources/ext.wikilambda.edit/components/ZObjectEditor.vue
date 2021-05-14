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
			:viewmode="false"
			@input="updateZobject"
		></z-object>
		<template v-if="showSaveCommand">
			<div>
				<!-- TODO: Replace this with a full save dialog (copywarn, IPwarn, minor edit box, …)? -->
				<label for="summary"> {{ $i18n( 'wikilambda-summarylabel' ) }} </label>
				<input v-model="summary"
					class="ext-wikilambda-editSummary"
					name="summary"
				>
			</div>
			<button @click="submit">
				{{ submitButtonLabel }}
			</button>
		</template>
		<div>
			Current ZObject:
			<z-object-json
				:viewmode="true"
				:zobject-raw="ZObjectJson"
			></z-object-json>
		</div>
		<wbmi-message v-if="message.text" :type="message.type">
			{{ message }}
		</wbmi-message>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObject = require( './ZObject.vue' ),
	WbmiMessage = require( './base/Message.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	mapMutations = require( 'vuex' ).mapMutations,
	ZObjectJson = require( './ZObjectJson.vue' );

module.exports = {
	name: 'ZObjectEditor',
	components: {
		'z-object': ZObject,
		'wbmi-message': WbmiMessage,
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
		showSaveCommand: function () {
			// TODO: Move this into its own vuex store as things gets more complicated and more view settigns are set
			// we currently hide the save command for evaluate function call.
			return mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'EvaluateFunctionCall';
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'submitZObject' ] ),
		mapMutations( [ 'addZKeyLabel', 'setZLangs' ] ),
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
		var languageChain = mw.language.getFallbackLanguageChain();

		// Set user language
		this.setZLangs( languageChain );

		// Pre-fetch a list of the most common Zids
		this.fetchZKeys( [
			Constants.Z_OBJECT,
			Constants.Z_PERSISTENTOBJECT,
			Constants.Z_MULTILINGUALSTRING,
			Constants.Z_KEY,
			Constants.Z_TYPE,
			Constants.Z_STRING,
			Constants.Z_FUNCTION,
			Constants.Z_FUNCTION_CALL,
			Constants.Z_REFERENCE,
			Constants.Z_LIST
		] );
	}
};
</script>

<style lang="less">
.ext-wikilambda-editSummary {
	width: 100%;
}

.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
